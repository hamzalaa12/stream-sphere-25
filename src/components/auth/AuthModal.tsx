import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'خطأ في تسجيل الدخول',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'مرحباً بك!',
            description: 'تم تسجيل الدخول بنجاح',
          });
          onClose();
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast({
            title: 'خطأ في إنشاء الحساب',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'تم إنشاء الحساب بنجاح!',
            description: 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب',
          });
          onClose();
        }
      }
    } catch (error) {
      toast({
        title: 'حدث خطأ',
        description: 'حاول مرة أخرى لاحقاً',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={!isLogin}
                className="bg-background-secondary border-border"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              البريد الإلكتروني
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background-secondary border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              كلمة المرور
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background-secondary border-border"
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            variant="primary"
            disabled={loading}
          >
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب'}
          </Button>
        </form>
        
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setIsLogin(!isLogin)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isLogin 
              ? 'ليس لديك حساب؟ إنشاء حساب جديد' 
              : 'لديك حساب بالفعل؟ تسجيل الدخول'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};